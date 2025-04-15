import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const {
    apiKey: key,
    messages,
    model = 'gpt-4o-mini',
    system,
  } = await req.json();

  try {
    const result = await streamText({
      maxTokens: 2048,
      messages: convertToCoreMessages(messages),
      model: google('gemini-2.0-flash-exp'),
      system: system,
    });

    return result.toDataStreamResponse();
  } catch {
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
