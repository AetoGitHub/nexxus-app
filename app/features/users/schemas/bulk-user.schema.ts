interface BulkUserSchemaMessages {
  companyRequired: string
  userRequired: string
  emailRequired: string
  emailInvalid: string
  whatsappRequired: string
  usersMin: string
}

export function createBulkUserSchema(messages: BulkUserSchemaMessages) {
  return z.object({
    company: z.number({ error: messages.companyRequired })
      .int()
      .positive(messages.companyRequired),
    users: z.array(z.object({
      username: z.string({ error: messages.userRequired })
        .trim()
        .min(1, messages.userRequired)
        .transform(value => value.toLocaleUpperCase()),
      email: z.string({ error: messages.emailRequired })
        .trim()
        .min(1, messages.emailRequired)
        .email(messages.emailInvalid),
      whatsapp: z.string({ error: messages.whatsappRequired })
        .trim()
        .min(1, messages.whatsappRequired),
    })).min(1, messages.usersMin),
  })
}

export type BulkUserSchema = z.output<ReturnType<typeof createBulkUserSchema>>
