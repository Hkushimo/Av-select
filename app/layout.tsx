import "./globals.css";
import AccountNav from "./account-nav";
export const metadata={title:"AV Select",description:"Private AV technician roster and dispatch"};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><AccountNav/>{children}</body></html>;
}
