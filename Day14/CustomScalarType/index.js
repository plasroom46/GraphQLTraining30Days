const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// GraphQL Schema 定義
const typeDefs = gql`

"""
日期格式。顯示時以 Unix Timestamp in Milliseconds 呈現。
"""
scalar Date

# 宣告後就可以在底下直接使用
type Query {
  # 獲取現在時間
  now: Date
  # 詢問日期是否為週五... TGIF!!
  isFriday(date: Date!): Boolean
}
`;


const resolvers = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value) {
      // value sent to the client
      // 輸出到前端
      return value.getTime();
    },
    parseValue(value) {
      // value from the client (variables)
      // 從前端 variables 進來的 input
      return new Date(value);
    },
    parseLiteral(ast) {
      // value from the client (inline)
      // 從前端 inline variables 進來的 input
      if (ast.kind === Kind.INT) {
        return new Date(parseInt(ast.value, 10)); // ast value is always in string format
      }
      return null;
    }
  }),
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