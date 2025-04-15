import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const {
    apiKey: key,
    model = 'gpt-4o-mini',
    prompt,
    system,
  } = await req.json();





  try {
    const result = await generateText({
      abortSignal: req.signal,
      maxTokens: 50,
      model:  google('gemini-2.0-flash-exp'),
      prompt: prompt,
      system,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json(null, { status: 408 });
    }

    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
