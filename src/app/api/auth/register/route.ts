import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { MongoClient, Db } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Missing required fields (email, password, name).' }, { status: 400 });
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ message: 'Invalid email format.' }, { status: 400 });
    }

    // Basic password validation (e.g., minimum length)
    if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }


    const client: MongoClient = await clientPromise;
    const db: Db = client.db();
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
      role: 'viewer', // Default role for new users
      createdAt: new Date(),
      updatedAt: new Date(),
      image: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`, // Default placeholder image
    });

    if (!result.insertedId) {
        return NextResponse.json({ message: 'Failed to create user account.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User registered successfully.' }, { status: 201 });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'An error occurred during registration.' }, { status: 500 });
  }
}
