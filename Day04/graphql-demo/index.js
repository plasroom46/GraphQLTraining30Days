const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

// 1. 加入假資料
const users = [
    {
      id: 1,
      name: 'Fong',
      age: 23
    },
    {
      id: 2,
      name: 'Kevin',
      age: 40
    },
    {
      id: 3,
      name: 'Mary',
      age: 18
    }
  ];


// The GraphQL schema
// 2. 新增 User type 、在 Query 中新增 me field
const typeDefs = gql`
  """
  使用者資訊
  """
  type User {
    "識別碼"
    id: ID
    "名字"
    name: String
    "年齡"
    age: Int
  }

  type Query {
    "A simple type for getting started!"
    hello: String
    "取得當下使用者"
    me: User
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
    Query: {
      // 需注意名稱一定要對到 Schema 中 field 的名稱  
      hello: () => 'world',
      // 3. 加上 me 的 resolver (一定要在 Query 中喔)
      me: () => users[0]
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