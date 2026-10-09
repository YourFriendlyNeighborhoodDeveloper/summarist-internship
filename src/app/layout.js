import { Roboto } from "next/font/google";
import Providers from "@/components/providers/Providers";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata = {
  title: {
    default: "Summarist",
    template: "%s | Summarist",
  },
  description:
    "Gain more knowledge in less time. Read or listen to the key ideas from the best books with Summarist.",
};

export const viewport = {
  themeColor: "#032b41",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
