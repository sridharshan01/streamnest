import "./globals.css";
import Nav from "@/components/Nav";
export const metadata = { title: "StreamNest", description: "Paste a video link. Watch or download it when the host allows." };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Nav /><main>{children}</main><footer>Privacy · Terms · Help</footer></body></html>;
}
