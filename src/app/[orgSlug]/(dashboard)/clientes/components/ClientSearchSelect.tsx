"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientSearchSelectProps {
    clients: any[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
}

export function ClientSearchSelect({
    clients,
    value,
    onValueChange,
    placeholder = "Selecionar cliente..."
}: ClientSearchSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedClient = clients.find((client) => client.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedClient ? selectedClient.name : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar cliente por nome, CNPJ ou ID..." />
                    <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                            {clients.map((client) => (
                                <CommandItem
                                    key={client.id}
                                    value={`${client.name} ${client.document} ${client.registrationId}`}
                                    onSelect={() => {
                                        onValueChange(client.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{client.name}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {client.company || "PF"} • ID: {client.registrationId} • {client.document}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
