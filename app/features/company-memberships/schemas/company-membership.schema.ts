interface CompanyMembershipSchemaMessages {
  companyRequired: string
}

export function createCompanyMembershipSchema(messages: CompanyMembershipSchemaMessages) {
  return z.object({
    company: z.number({ error: messages.companyRequired })
      .int()
      .positive(messages.companyRequired),
  })
}

export type CompanyMembershipSchema = z.output<ReturnType<typeof createCompanyMembershipSchema>>
