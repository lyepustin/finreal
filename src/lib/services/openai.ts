import { OPENAI_API_KEY } from '$env/static/private';
import type { Category } from '$lib/types';

/**
 * Sends a request to OpenAI to get category prediction for a transaction
 */
export async function predictTransactionCategory(
    description: string,
    categories: Category[]
): Promise<{ categoryId: number; subcategoryId: number | null }> {
    try {
        // Format categories into a more readable structure
        const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            subcategories: cat.subcategories?.map(sub => ({
                id: sub.id,
                name: sub.name
            })) || []
        }));

        // Create a human-readable list of categories
        const categoryList = formattedCategories.map(cat => {
            const subcatList = cat.subcategories.length > 0 
                ? `\n    Subcategories:\n${cat.subcategories.map(sub => `      - ${sub.name} (id: ${sub.id})`).join('\n')}`
                : '';
            return `- ${cat.name} (id: ${cat.id})${subcatList}`;
        }).join('\n');

        // Prepare the chat completion prompt
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a financial transaction classifier. Your task is to analyze a transaction description and choose the most appropriate category and subcategory from the provided options. Choose exactly one category and optionally one subcategory if available.

Rules:
1. Always respond with a valid category ID from the list
2. Only use subcategory IDs that belong to the chosen category
3. If no appropriate subcategory exists, return null for subcategoryId
4. Respond only with the JSON object, no explanation needed`
                    },
                    {
                        role: 'user',
                        content: `Transaction description: "${description}"

Available Categories:
${categoryList}

Respond with only a JSON object in this format:
{
  "categoryId": number,
  "subcategoryId": number or null
}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenAI API error:', error);
            throw new Error('Failed to predict category');
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error('No prediction received from AI');
        }

        try {
            // Parse the JSON response
            const parsedResponse = JSON.parse(content);
            
            // Validate the response
            if (typeof parsedResponse.categoryId !== 'number') {
                throw new Error('Invalid categoryId in AI response');
            }
            
            if (parsedResponse.subcategoryId !== null && typeof parsedResponse.subcategoryId !== 'number') {
                throw new Error('Invalid subcategoryId in AI response');
            }

            // Validate that the category exists
            const category = categories.find(c => c.id === parsedResponse.categoryId);
            if (!category) {
                throw new Error('Selected category ID does not exist');
            }

            // Validate that the subcategory belongs to the selected category
            if (parsedResponse.subcategoryId !== null) {
                const subcategory = category.subcategories?.find(s => s.id === parsedResponse.subcategoryId);
                if (!subcategory) {
                    throw new Error('Selected subcategory ID does not belong to the selected category');
                }
            }
            
            return {
                categoryId: parsedResponse.categoryId,
                subcategoryId: parsedResponse.subcategoryId
            };
        } catch (e) {
            console.error('Error parsing AI response:', e, content);
            throw new Error('Failed to parse AI prediction');
        }
    } catch (error) {
        console.error('Error predicting transaction category:', error);
        throw error;
    }
} 