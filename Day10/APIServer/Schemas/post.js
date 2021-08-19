const { gql, ForbiddenError } = require('apollo-server')

// Construct a schema, using GraphQL schema language

// GraphQL Schema 定義
const typeDefs = gql`
"""
貼文
"""
type Post {
  "識別碼"
  id: ID!
  "作者"
  author: User
  "標題"
  title: String
  "內容"
  body: String
  "按讚者"
  likeGivers: [User]
  "建立時間 (ISO 格式)"
  createdAt: String
}
# Query Type Schema
extend type Query {
  "取得所有貼文"
  posts: [Post]
  "依照 id 取得特定貼文"
  post(id: ID!): Post
}

input AddPostInput {
  title: String!
  body: String
}

# 3-3. Mutation 分開可能需要使用命名，否則在網頁 Demo 輸入會不知道要找哪個 Mutation，最終導致無結果出現
extend type Mutation {
  addPost(input: AddPostInput!): Post
  likePost(postId: ID!): Post
  # 4-2. 檢查是否作者 isPostAuthor ?
  "刪貼文"
  deletePost(postId: ID!): Post
} 
`;

 // helper functions 

 // 4-1. 檢查有無認證 isAuthenticated
const isAuthenticated = resolverFunc => (parent, args, context) => {
    if (!context.me) throw new ForbiddenError('Not logged in.');
    return resolverFunc.apply(null, [parent, args, context]);
    };

 const isPostAuthor = resolverFunc => (parent, args, context) => {
    const { postId } = args;
    const { me, postModel } = context
    const isAuthor = postModel.findPostByPostId(postId).authorId === me.id;
    if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
    return resolverFunc.applyFunc(parent, args, context);
    }
    

// Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
    // Query Type Resolver
    Query: {
      posts: (root, args, { postModel }) => postModel.getAllPosts(),
      post: (root, { id }, { postModel }) => postModel.findPostByPostId(id)
    },
    Post: {
      author: (parent, args, { userModel }) => userModel.findUserByUserId(parent.authorId),
      likeGivers: (parent, args, { userModel }) =>
      userModel.filterUsersByUserIds(parent.likeGiverIds)
    },
    // Mutation Type Resolver
    // 3-3. Mutation 分開可能需要使用命名，否則在網頁 Demo 輸入會不知道要找哪個 Mutation，最終導致無結果出現
    Mutation: {
      addPost: isAuthenticated((parent, { input }, { me,postModel }) => {
        const { title, body } = input;
        return postModel.addPost({ authorId: me.id, title, body });
      }),
      likePost: isAuthenticated((parent, { postId }, { me,postModel }) => {
  
        const post = postModel.findPostByPostId(postId);
  
        if (!post) throw new Error(`Post ${postId} Not Exists`);
  
        if (!post.likeGiverIds.includes(postId)) {
          return postModel.updatePost(postId, {
            likeGiverIds: post.likeGiverIds.concat(me.id)
          });
        }
        return postModel.updatePost(postId, {
          likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
        });
      }),
      // 4-2. 檢查是否作者 isPostAuthor ?
      deletePost: isAuthenticated(
        isPostAuthor((root, { postId }, { me,postModel }) => postModel.deletePost(postId))),
    }
  };    

  module.exports = {
    typeDefs,
    resolvers
  };