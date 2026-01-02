import { useQuery } from "@tanstack/react-query";

export function Ids({ children }: { children: string }) {
  const { data } = useQuery({
    queryKey: ["ids", children],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/ids/${children}`).then((r) =>
        r.json()
      ),
  });
  return data?.label?.trim() ?? children;
}
