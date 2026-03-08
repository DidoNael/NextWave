"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ColorTheme = "default" | "orange" | "blue" | "chartmogul";

interface ColorContextType {
    colorTheme: ColorTheme;
    setColorTheme: (theme: ColorTheme) => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function ColorProvider({ children }: { children: React.ReactNode }) {
    const [colorTheme, setColorTheme] = useState<ColorTheme>("blue"); // Default set to blue as per user logo preference

    useEffect(() => {
        const saved = localStorage.getItem("nextwave-color-theme") as ColorTheme;
        if (saved) setColorTheme(saved);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute("data-theme", colorTheme);
        localStorage.setItem("nextwave-color-theme", colorTheme);
    }, [colorTheme]);

    return (
        <ColorContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ColorContext.Provider>
    );
}

export const useColorTheme = () => {
    const context = useContext(ColorContext);
    if (!context) throw new Error("useColorTheme must be used within ColorProvider");
    return context;
};
