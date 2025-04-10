import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";import { getPrismaInstance } from '@/lib/prisma'; 

const prisma = getPrismaInstance();
import { encryptToken } from '@/lib/crypto'; // Import the encryption function

// --- Handler for POST requests (Save Token) ---
export async function POST(request: Request) {
  // 1. Get the server-side session to identify the logged-in user
  const session = await getServerSession(authOptions);

  // 2. Check if the user is authenticated
  if (!session?.user?.id) {
    // Not logged in or session invalid
    return NextResponse.json({ error: 'Unauthorized: User not authenticated.' }, { status: 401 });
  }

  try {
    // 3. Parse the request body to get the token
    const body = await request.json();
    const { token } = body;

    // 4. Validate the received token
    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({ error: 'Bad Request: Token is missing or invalid.' }, { status: 400 });
    }
    const trimmedToken = token.trim();
    // Basic format check (Up tokens usually start with 'up:yeah:')
    if (!trimmedToken.startsWith('up:yeah:')) {
        return NextResponse.json({ error: "Bad Request: Invalid token format. Expected 'up:yeah:...'" }, { status: 400 });
    }

    // 5. Encrypt the token using the utility function
    const { encryptedToken, iv, authTag } = encryptToken(trimmedToken);

    // 6. Save the encrypted data to the database for the logged-in user
    await prisma.user.update({
      where: {
        id: session.user.id, // Find the user by their unique ID from the session
      },
      data: {
        // Store the encrypted components
        encryptedUpToken: encryptedToken,
        upTokenIv: iv,
        upTokenAuthTag: authTag,
      },
    });

    // 7. Return a success response
    console.log(`Successfully saved encrypted Up token for user: ${session.user.id}`); // Server log
    return NextResponse.json({ message: 'Token saved successfully.' }, { status: 200 });

  } catch (error: any) {
    // Handle potential errors during parsing, encryption, or database update
    console.error(`Error saving token for user ${session.user?.id}:`, error);

    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ error: 'Bad Request: Invalid JSON format.' }, { status: 400 });
    }

    // Generic error for other issues
    return NextResponse.json({ error: 'Internal Server Error: Failed to save token.' }, { status: 500 });
  }
}

// --- Handler for DELETE requests (Remove Token) ---
export async function DELETE(request: Request) { // Added 'request' parameter, though not strictly needed for this simple DELETE
    // 1. Get the server-side session
    const session = await getServerSession(authOptions);

    // 2. Check authentication
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized: User not authenticated.' }, { status: 401 });
    }

    try {
        // 3. Update the user record to remove the token details
        await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                // Set the encrypted token fields back to null
                encryptedUpToken: null,
                upTokenIv: null,
                upTokenAuthTag: null,
            },
        });

        // 4. Return success response
        console.log(`Successfully removed Up token for user: ${session.user.id}`); // Server log
        return NextResponse.json({ message: 'Token removed successfully.' }, { status: 200 });

    } catch (error) {
        // Handle potential errors during database update
        console.error(`Error removing token for user ${session.user?.id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error: Failed to remove token.' }, { status: 500 });
    }
}