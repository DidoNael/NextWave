const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findFirst({ include: { organization: true } })
  console.log(JSON.stringify({
    email: user.email,
    role: user.role,
    orgSlug: user.organization?.slug,
    orgName: user.organization?.name
  }, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
