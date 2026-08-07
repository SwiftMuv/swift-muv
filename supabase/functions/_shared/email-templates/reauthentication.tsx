/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://swift-muv.lovable.app/__l5e/assets-v1/cf51cce1-c716-41b0-b481-0c5f681b7108/swiftmuv-logo-nl2.png'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={LOGO_URL}
          alt="SwiftMuv"
          width="160"
          height="44"
          style={logoStyle}
        />
        <Text style={wordmark}>SwiftMuv — Moving forward. Effortlessly.</Text>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"DM Sans", -apple-system, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: '"Space Grotesk", -apple-system, Helvetica, Arial, sans-serif',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 25%, 10%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 10%, 35%)',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: '"Space Grotesk", "Courier New", monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 84%, 35%)',
  letterSpacing: '4px',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 55%)', margin: '32px 0 0' }
const logoStyle = {
  margin: '0 0 8px',
  display: 'block',
  width: '160px',
  maxWidth: '100%',
  height: 'auto',
  border: '0',
  outline: 'none',
  textDecoration: 'none',
  lineHeight: '100%',
}
const wordmark = {
  fontFamily: '"Space Grotesk", -apple-system, Helvetica, Arial, sans-serif',
  fontSize: '12px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.4px',
  color: 'hsl(220, 10%, 45%)',
  margin: '0 0 24px',
}
