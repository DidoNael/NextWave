import { PixPayment } from "@/components/financeiro/PixPayment";

export default function PixDemoPage() {
    return (
        <div className="p-8 flex items-center justify-center min-h-[80vh]">
            <PixPayment amount={299.90} orderId="NW-8842" />
        </div>
    );
}
