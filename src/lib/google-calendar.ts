import { google } from "googleapis";
import { prisma } from "./db";

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function getGoogleAuthUrl() {
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar.events"],
        prompt: "consent",
    });
}

export async function getTokensFromCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

export async function getAuthorizedClient(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            googleAccessToken: true,
            googleRefreshToken: true,
            googleTokenExpiry: true,
        },
    });

    if (!user?.googleAccessToken || !user?.googleRefreshToken) {
        return null;
    }

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
        expiry_date: user.googleTokenExpiry?.getTime(),
    });

    // Handle token refreshing automatically
    client.on("tokens", async (tokens) => {
        if (tokens.refresh_token) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                },
            });
        } else {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    googleAccessToken: tokens.access_token,
                    googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                },
            });
        }
    });

    return client;
}

export async function pushEventToGoogle(userId: string, event: {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    location?: string;
}) {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: {
                dateTime: event.startDate.toISOString(),
            },
            end: {
                dateTime: (event.endDate || new Date(event.startDate.getTime() + 3600000)).toISOString(),
            },
        },
    });

    return response.data.id;
}

export async function updateGoogleEvent(userId: string, googleEventId: string, event: {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    location?: string;
}) {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.update({
        calendarId: "primary",
        eventId: googleEventId,
        requestBody: {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: {
                dateTime: event.startDate.toISOString(),
            },
            end: {
                dateTime: (event.endDate || new Date(event.startDate.getTime() + 3600000)).toISOString(),
            },
        },
    });
}

export async function deleteGoogleEvent(userId: string, googleEventId: string) {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
    });
}
