import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

function getFilePath(): string {
  const parentPath = path.resolve(process.cwd(), '..', 'permissions.json')
  if (fs.existsSync(parentPath)) return parentPath
  const currentPath = path.resolve(process.cwd(), 'permissions.json')
  if (fs.existsSync(currentPath)) return currentPath
  return parentPath
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function GET() {
  try {
    const filePath = getFilePath()
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({}, { headers: CORS_HEADERS })
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('Error reading permissions file:', err)
    return NextResponse.json(
      { error: 'Failed to read permissions' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const filePath = getFilePath()
    const body = await req.json()
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8')
    return NextResponse.json(body, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('Error writing permissions file:', err)
    return NextResponse.json(
      { error: 'Failed to write permissions' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
