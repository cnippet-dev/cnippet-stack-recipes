import { Card, CardHeader } from "../ui/card";

export function Delete() {
  return (
    <Card>
      <CardHeader className="flex items-end gap-0 tracking-tighter">
        <p className="font-semibold text-3xl">D</p>
        <p className="text-base">elete</p>
      </CardHeader>
    </Card>
  );
}
