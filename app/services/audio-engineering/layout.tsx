import JsonLd, { audioEngineeringServiceSchema } from "@/components/JsonLd";

export default function AudioEngineeringLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={audioEngineeringServiceSchema} />
      {children}
    </>
  );
}
