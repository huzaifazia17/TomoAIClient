import './globals.css';
import AuthWrapper from './components/authWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>TomoAI</title>
        <meta name="description" content="AI-powered chat application" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}