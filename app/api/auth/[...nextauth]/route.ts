import NextAuth from "next-auth"
import Google from "next-auth/providers/google";
import 'dotenv/config'

console.log(process.env)

const handler = NextAuth({
    providers:[
        Google({
          clientId: process.env.NEXT_PUBLIC_GOOGLE_ID,
          clientSecret: process.env.GOOGLE_SECRET
        })
      ],
});

export { handler as GET, handler as POST }