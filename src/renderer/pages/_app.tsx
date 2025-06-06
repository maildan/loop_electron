import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { ElectronProvider } from '../hooks/useElectron';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ElectronProvider>
        <Component {...pageProps} />
      </ElectronProvider>
    </ThemeProvider>
  );
}

export default MyApp;
