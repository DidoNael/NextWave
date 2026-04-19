"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AccentColor = "blue" | "orange" | "green" | "purple" | "rose" | "pink";
export type LayoutTheme = "default" | "professional";

interface ColorContextType {
    accentColor: AccentColor;
    layoutTheme: LayoutTheme;
    setAccentColor: (color: AccentColor) => void;
    setLayoutTheme: (theme: LayoutTheme) => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

const VALID_COLORS: AccentColor[] = ["blue", "orange", "green", "purple", "rose", "pink"];
const VALID_LAYOUTS: LayoutTheme[] = ["default", "professional"];
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

function setCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ColorProvider({
    children,
    initialColor = "blue",
    initialLayout = "default",
}: {
    children: React.ReactNode;
    initialColor?: AccentColor;
    initialLayout?: LayoutTheme;
}) {
    const [accentColor, setAccentColorState] = useState<AccentColor>(initialColor);
    const [layoutTheme, setLayoutThemeState] = useState<LayoutTheme>(initialLayout);

    // Persistência local (rápida)
    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute("data-color", accentColor);
        root.setAttribute("data-layout", layoutTheme);
        localStorage.setItem("nextwave-accent-color", accentColor);
        localStorage.setItem("nextwave-layout-theme", layoutTheme);
        setCookie("nextwave-accent-color", accentColor);
        setCookie("nextwave-layout-theme", layoutTheme);
    }, [accentColor, layoutTheme]);

    // Persistência no Banco (Debounced ou Direta)
    useEffect(() => {
        const syncWithDb = async () => {
            try {
                await fetch("/api/user/preferences", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accentColor, layoutTheme }),
                });
            } catch (err) {
                console.error("Erro ao sincronizar tema com banco", err);
            }
        };

        // Não roda o sync se for o valor inicial exato (evita calls desnecessárias no load)
        const isDefault = accentColor === initialColor && layoutTheme === initialLayout;
        if (!isDefault) {
            const timer = setTimeout(syncWithDb, 1000);
            return () => clearTimeout(timer);
        }
    }, [accentColor, layoutTheme, initialColor, initialLayout]);

    // Sincroniza estado inicial com localStorage caso seja diferente do initial props (server side)
    useEffect(() => {
        const savedColor = localStorage.getItem("nextwave-accent-color") as AccentColor;
        const savedLayout = localStorage.getItem("nextwave-layout-theme") as LayoutTheme;
        if (savedColor && VALID_COLORS.includes(savedColor) && savedColor !== accentColor) {
            setAccentColorState(savedColor);
        }
        if (savedLayout && VALID_LAYOUTS.includes(savedLayout) && savedLayout !== layoutTheme) {
            setLayoutThemeState(savedLayout);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <ColorContext.Provider value={{
            accentColor,
            layoutTheme,
            setAccentColor: setAccentColorState,
            setLayoutTheme: setLayoutThemeState,
        }}>
            {children}
        </ColorContext.Provider>
    );
}

export function useColorTheme() {
    const context = useContext(ColorContext);
    if (!context) throw new Error("useColorTheme must be used within ColorProvider");
    return context;
}
