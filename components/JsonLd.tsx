export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Asa Luke",
  url: "https://www.asaluke.io",
  description:
    "Professional content editing, audio engineering, and fitness coaching by Asa Luke.",
  sameAs: ["https://www.instagram.com/AsaLuke"],
  contactPoint: {
    "@type": "ContactPoint",
    email: "info.lifeupventures@gmail.com",
    contactType: "customer service",
  },
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Asa Luke",
  url: "https://www.asaluke.io",
  description:
    "I edit your content. I mix your music. I build your body. Professional content editing, audio engineering, and fitness coaching.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Los Angeles",
    addressRegion: "CA",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  priceRange: "$$",
  image: "https://www.asaluke.io/og-image.png",
  sameAs: ["https://www.instagram.com/AsaLuke"],
};

export const contentEditingServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Content Editing",
  description:
    "Professional short-form video editing for Reels, TikTok, and YouTube Shorts. Strategy, shooting guidance, editing, and posting.",
  provider: {
    "@type": "Organization",
    name: "Asa Luke",
    url: "https://www.asaluke.io",
  },
  serviceType: "Video Editing",
  areaServed: { "@type": "Country", name: "United States" },
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "247",
      priceCurrency: "USD",
      description: "12 Reels/month",
    },
    {
      "@type": "Offer",
      name: "Growth",
      price: "497",
      priceCurrency: "USD",
      description: "20 Reels/month + Stories",
    },
    {
      "@type": "Offer",
      name: "VIP",
      price: "897",
      priceCurrency: "USD",
      description: "30 Reels/month + full social media management",
    },
  ],
};

export const audioEngineeringServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Audio Engineering",
  description:
    "Professional mixing and mastering for independent artists. Music production, vocal mixing, and audio post-production.",
  provider: {
    "@type": "Organization",
    name: "Asa Luke",
    url: "https://www.asaluke.io",
  },
  serviceType: "Audio Engineering",
  areaServed: { "@type": "Country", name: "United States" },
  offers: [
    {
      "@type": "Offer",
      name: "Single Mix",
      price: "99",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Mix & Master",
      price: "149",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Full Project",
      price: "799",
      priceCurrency: "USD",
    },
  ],
};

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
