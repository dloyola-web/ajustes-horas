import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    return NextResponse.redirect(`${origin}${next}?auth_code=${code}`)
  }

  return NextResponse.redirect(`${origin}?error=auth`)
}
