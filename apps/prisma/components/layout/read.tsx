import { Card, CardHeader } from "../ui/card";

export function Read() {
  return (
    <Card>
      <CardHeader className="flex items-end gap-0 tracking-tighter">
        <p className="font-semibold text-3xl">R</p>
        <p className="text-base">ead</p>
      </CardHeader>
    </Card>
  );
}
