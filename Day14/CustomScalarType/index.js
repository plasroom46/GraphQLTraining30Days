const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

// 2-1. 引入外部套件
const { DateTime } = require('@okgrow/graphql-scalars');

// GraphQL Schema 定義
const typeDefs = gql`
scalar DateTime

type Query {
  # 獲取現在時間
  now: DateTime
  # 詢問日期是否為週五... TGIF!!
  isFriday(date: DateTime!): Boolean
}
`;



const resolvers = {
  DateTime,
  Query: {
    now: () => new Date(),
    isFriday: (root, { date }) => date.getDay() === 5
  }
};

// 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers
});

// 啟動 Server
server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});