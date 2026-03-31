import JsonLd, { contentEditingServiceSchema } from "@/components/JsonLd";

export default function ContentEditingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={contentEditingServiceSchema} />
      {children}
    </>
  );
}
