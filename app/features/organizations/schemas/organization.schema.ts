export function createOrganizationSchema(messages: { nameRequired: string }) {
  return z.object({
    name: z.string({ error: messages.nameRequired }).trim().min(1, messages.nameRequired),
  })
}

export type OrganizationSchema = z.output<ReturnType<typeof createOrganizationSchema>>
