import axios from "axios";

export async function getLatestWhatsAppVersion(): Promise<string | null> {
    try {
        const response = await axios.get("https://web.whatsapp.com", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        const html = response.data;

        // Procurar por padrões de versão como "2.3000.xxxx" ou pelo __rev
        // O WhatsApp Web usa manifestos ou scripts principais. 
        // Vamos tentar capturar a revisão ou versão no HTML
        const versionMatch = html.match(/version":"([^"]+)"/) || html.match(/manifest-([0-9.]+)\.json/);

        if (versionMatch && versionMatch[1]) {
            return versionMatch[1];
        }

        // Fallback: tentar encontrar o __rev em scripts (comum em versões recentes)
        const revMatch = html.match(/__rev=([0-9]+)/) || html.match(/revision":([0-9]+)/);
        if (revMatch && revMatch[1]) {
            return `2.3000.${revMatch[1]}`;
        }

        return null;
    } catch (error) {
        console.error("Erro ao verificar versão do WhatsApp:", error);
        return null;
    }
}
