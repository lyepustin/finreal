import { OPENAI_API_KEY } from '$env/static/private';
import type { Category, SubCategory } from '$lib/types';

type CategoryWithRules = {
    id: number;
    name: string;
    rules?: string[];
    subcategories: SubCategory[];
};

/**
 * Sends a request to OpenAI to get category prediction for a transaction
 */
export async function predictTransactionCategory(
    description: string,
    categories: Category[],
    rules: {
        categoryId: number;
        rule: string;
    }[]
): Promise<{ categoryId: number; subcategoryId: number | null }> {
    try {
        // Organize categories and rules
        const categoriesWithRules: CategoryWithRules[] = categories.map(category => {
            const categoryRules = rules
                .filter(r => r.categoryId === category.id)
                .map(r => r.rule);
            
            return {
                id: category.id,
                name: category.name,
                rules: categoryRules.length > 0 ? categoryRules : undefined,
                subcategories: category.subcategories || []
            };
        });

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
                        content: 'You are a financial categorization assistant. Your task is to classify a transaction into the most appropriate category and subcategory based on its description.'
                    },
                    {
                        role: 'user',
                        content: `
                        I need to categorize the following transaction: "${description}"
                        
                        Here are the available categories and subcategories:
                        ${JSON.stringify(categoriesWithRules, null, 2)}
                        
                        Please respond with only a JSON object in this exact format:
                        {
                          "categoryId": number,
                          "subcategoryId": number or null,
                          "reasoning": "brief explanation"
                        }
                        `
                    }
                ],
                temperature: 0.3,
                max_tokens: 250
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
            
            // Return only what we need
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