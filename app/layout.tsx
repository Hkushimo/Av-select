import "./globals.css";
import type {Viewport} from "next";
import AccountNav from "./account-nav";

export const metadata={title:"AV Select",description:"Private AV technician roster and dispatch",manifest:"/manifest.webmanifest"};
// Android uses the theme color for installed web-app system chrome.
export const viewport:Viewport={
 width:"device-width",
 initialScale:1,
 viewportFit:"cover",
 themeColor:"#090d17",
 colorScheme:"dark",
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><AccountNav/>{children}</body></html>;
}
