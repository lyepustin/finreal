export type Transaction = {
    id: number
    uuid: string
    account_id: number
    operation_date: string
    value_date: string | null
    inserted_at: string
    description: string
    user_description: string | null
    categories: TransactionCategory[]
    account: Account
}

export type TransactionCategory = {
    id: number
    transaction_id: number
    category_id: number
    subcategory_id: number | null
    amount: number
    category: Category
    subcategory: SubCategory | null
}

export type Category = {
    id: number
    name: string
    subcategories: SubCategory[]
    user_id: string
}

export type SubCategory = {
    id: number
    category_id: number
    name: string
}

export type Account = {
    id: number
    bank_id: number
    account_type: 'bank_account' | 'virtual_card'
    account_number: string
    bank: Bank
}

export type Bank = {
    id: number
    name: string
    user_id: string
}

export type Rule = {
    id: number
    pattern: string
    category_id: number
    subcategory_id: number
    user_id: string
} 