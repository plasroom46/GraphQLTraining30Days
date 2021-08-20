const { ApolloServer, gql } = require('apollo-server');


const typeDefs = gql`

type Person {
  name: String
  age: Int
}

type Query {
  hello: String
  getString: String
  getInt: Int
  getFloat: Float
  people(first: Int): [Person]
}
`;

const resolvers = {
  Query: {
    hello: () => 'Not used',
  },
};

var casual = require('casual');

const mocks = {
  Int: () => 6,
  Float: () => 22.1,
  String: () => 'Hello',
  Query: () =>({
    people: (root, { first }, context) => {
      if (first) {
          return [...new Array(casual.integer(0, Math.round(Math.random()* (first+1) )))]
      }
        return [...new Array(casual.integer(0, Math.round(Math.random()*13)))]
      }
  }),
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  mocks,
});

server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`)
});