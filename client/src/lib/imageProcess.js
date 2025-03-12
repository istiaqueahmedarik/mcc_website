'use server'

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

export async function detectObjectsFromBase64(base64ImageUrl) {
    const url = 'https://api.landing.ai/v1/tools/agentic-object-detection';
    const formData = new FormData();

    const base64Response = await fetch(base64ImageUrl);
    const arrayBuffer = await base64Response.arrayBuffer();
    formData.append('image', new Blob([arrayBuffer]), 'image.jpg');
    formData.append('prompts', "profile_picture");
    formData.append('model', 'agentic');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                Authorization: `Basic ${process.env.AGENTIC_API_KEY}`,
            },
        });
        const data = await response.json();
        console.log(JSON.stringify(data));

        let bounding_box;
        try {
            bounding_box = data.data[0][0].bounding_box;
        } catch {
            console.log('No bounding box found');
            bounding_box = [16, 108, 126, 215];
        }
        return { bounding_box: JSON.stringify(bounding_box) };
    } catch (error) {
        console.error(error);
    }
    return { bounding_box: JSON.stringify([16, 108, 126, 215]) };
}


export async function OCRImage(image) {
    const result = await generateText({
        model: google('gemini-2.0-flash-exp', {
            structuredOutputs: true
        }),

        maxSteps: 10,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: "Respond this ID card in structured way" },
                    { type: 'image', image: image },
                ],
            },
        ],


        experimental_output: Output.object({
            schema: z.object({
                name: z.string(),
                Batch_details: z.string().describe("Batch details like CSE 22 or CE 21"),
                Roll_no: z.string(),
            }),
        }),
    });
    const bbox = await detectObjectsFromBase64(image);
    const ret = { ...result.experimental_output, ...bbox };
    return ret;

}