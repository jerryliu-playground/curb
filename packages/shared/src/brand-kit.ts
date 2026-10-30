import { z } from "zod";

/** Fonts bundled with the renderer (ADR 0011). Brand kits choose from these only. */
export const BUNDLED_FONTS = ["Inter", "Cormorant Garamond", "Playfair Display"] as const;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #1a2b3c");

export const BrandKitSchema = z.object({
  agentName: z.string().min(1).max(40),
  brokerage: z.string().min(1).max(50),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(50),
  colors: z.object({
    primary: hexColor,
    accent: hexColor,
    background: hexColor,
    text: hexColor,
  }),
  fonts: z.object({
    heading: z.enum(BUNDLED_FONTS),
    body: z.enum(BUNDLED_FONTS),
  }),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;
