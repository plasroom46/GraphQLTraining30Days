


// 4-1. 檢查有無認證 isAuthenticated
const { ApolloServer} = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)


const jwt = require('jsonwebtoken')

  
const { typeDefs, resolvers } = require('./Schemas')

const { userModel, postModel } = require('./Models')

// 1-1. 使用 .env 檔案
require('dotenv').config()


// 定義 bcrypt 加密所需 saltRounds 次數
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
// 定義 jwt 所需 secret (可隨便打)
const SECRET = process.env.SECRET;



// 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers,

  // 3-3. Context Setup
  context: async ({ req }) => {
    // 1. 取出
    const context = { secret: SECRET, saltRounds: SALT_ROUNDS,userModel,postModel };
    const token = req.headers['x-token'];
    if (token) {
      try {
        // 2. 檢查 token + 取得解析出的資料
        const me = await jwt.verify(token, SECRET);
        // 3. 放進 context
        return { ...context,me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    // 如果沒有 token 就回傳空的 context 出去
    return context;
  }
});

// 啟動 Server
server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});