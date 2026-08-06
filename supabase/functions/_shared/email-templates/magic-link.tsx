/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://swift-muv.lovable.app/__l5e/assets-v1/30b4c1a9-152d-40b4-b3ca-25f97211d477/swiftmuv-logo.png'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
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
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
const link = { color: 'hsl(160, 84%, 35%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(160, 84%, 39%)',
  color: 'hsl(220, 25%, 6%)',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
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
