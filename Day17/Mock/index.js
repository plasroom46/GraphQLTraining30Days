const { ApolloServer, gql } = require('apollo-server');

const typeDefs = gql`
type Query {
  hello: String
  getString: String
  getInt: Int
  getFloat: Float
}
`;

const resolvers = {
  Query: {
    hello: () => 'Not used',
  },
};

const mocks = {
  Int: () => 6,
  Float: () => 22.1,
  String: () => 'Hello',
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  mocks,
});

server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`)
});