// 1. 引入外部套件
const { ApolloServer, gql } = require('apollo-server');
const { defaultFieldResolver } = require('graphql');
const {SchemaDirectiveVisitor}=require('graphql-tools')

// 2. Directive 實作
class UpperCaseDirective extends SchemaDirectiveVisitor {
  // 2-1. ovveride field Definition 的實作
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    // 2-2. 更改 field 的 resolve function
    field.resolve = async function(...args) {
      // 2-3. 取得原先 field resolver 的計算結果 (因為 field resolver 傳回來的有可能是 promise 故使用 await)
      const result = await resolve.apply(this, args);
      // 2-4. 將得到的結果再做預期的計算 (toUpperCase)
      if (typeof result === 'string') {
        return result.toUpperCase();
      }
      // 2-5. 回傳最終值 (給前端)
      return result;
    };
  }
}

// 3. 定義新的 Directive
const typeDefs = gql`
  directive @upper on FIELD_DEFINITION

  type Query {
    hello: String @upper
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (root, args, context) => {
      return 'Hello world!';
    }
  }
};

// 4. Add directive to the ApolloServer constructor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // 4. 將 schema 的 directive 與實作連接並傳進 ApolloServer。
  schemaDirectives: {
    upper: UpperCaseDirective
  }
});

server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});