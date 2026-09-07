interface UserContextSchemaMessages {
  companyRequired: string
}

export function createUserContextSchema(messages: UserContextSchemaMessages) {
  return z.object({
    company: z.number({ error: messages.companyRequired })
      .int()
      .positive(messages.companyRequired),
  })
}

export type UserContextSchema = z.output<ReturnType<typeof createUserContextSchema>>
