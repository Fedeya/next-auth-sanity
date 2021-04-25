import Providers, { CredentialsProvider } from 'next-auth/providers';
import { SanityClient } from '@sanity/client';
import { getUserByEmailQuery } from './queries';
import argon2 from 'argon2';
import { IncomingMessage, ServerResponse } from 'node:http';

interface Options {
  client: SanityClient;
}

type CredentialsConfig = ReturnType<CredentialsProvider>;

export interface Handler {
  req: IncomingMessage & { body: any };
  res: ServerResponse & {
    json: (body: any) => void;
  };
  client: SanityClient;
}

export const signUpHandler = async ({ req, client, res }: Handler) => {
  const { email, password, name, image } = req.body;

  const user = await client.fetch(getUserByEmailQuery, {
    email
  });

  if (user) {
    res.json({ error: 'User already exist' });
    return;
  }

  const newUser = await client.create({
    _type: 'user',
    email,
    password: await argon2.hash(password),
    name,
    image
  });

  res.json({
    email: newUser.email,
    name: newUser.name,
    image: newUser.image
  });
};

export const SanityCredentials = ({ client }: Options): CredentialsConfig =>
  Providers.Credentials({
    credentials: {
      name: 'Credentials',
      email: {
        label: 'Email',
        type: 'text'
      },
      password: {
        label: 'Password',
        type: 'password'
      }
    },
    async authorize({ email, password }: { email: string; password: string }) {
      const user = await client.fetch(getUserByEmailQuery, {
        email
      });

      if (!user) throw new Error('Email does not exist');

      if (await argon2.verify(user.password, password)) {
        return {
          email: user.email,
          name: user.name,
          image: user.image,
          id: user.id
        };
      }

      throw new Error('Password Invalid');
    }
  });
