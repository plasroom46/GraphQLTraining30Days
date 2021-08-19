const { gql } = require('apollo-server')

const userSchema = require('./user')
const postSchema = require('./post')

// Construct a schema, using GraphQL schema language
// GraphQL Schema 定義
const typeDefs = gql`
# Query Type Schema
type Query {
  "測試用 Hello World"
  hello: String
}


type Mutation {
    test: Boolean
}
`;



// Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
    // Query Type Resolver
    Query: {
      hello: () => "world",
    },
    Mutation: {
      test:()=>"test",
    }
  };

  module.exports = {
    typeDefs: [typeDefs, userSchema.typeDefs, postSchema.typeDefs],
    resolvers: [resolvers, userSchema.resolvers, postSchema.resolvers]
  }