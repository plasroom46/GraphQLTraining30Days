// Mock Data & Field Resolver
const posts = [{
    id: 1,
    authorId: 1,
    title: 'Hello World',
    body: 'This is my first post',
    likeGiverIds: [1, 2],
    createdAt: '2018-10-22T01:40:14.941Z'
  },
  {
    id: 2,
    authorId: 2,
    title: 'Nice Day',
    body: 'Hello My Friend!',
    likeGiverIds: [1],
    createdAt: '2018-10-24T01:40:14.941Z'
  }
];


// helper functions

const getAllPosts = () => posts;

const filterPostsByUserId = userId =>
  posts.filter(post => userId === post.authorId);




const findPostByPostId = postId => posts.find(post => post.id === Number(postId));

// Mutation Type Resolver


const addPost = ({
    authorId,
    title,
    body
  }) =>
  (posts[posts.length] = {
    id: posts[posts.length - 1].id + 1,
    authorId,
    title,
    body,
    likeGiverIds: [],
    createdAt: new Date().toISOString()
  });

const updatePost = (postId, data) =>
  Object.assign(findPostByPostId(postId), data);

// 3-1. Register - Resolver



// 3-2. Login - Resolver


// 4-2. 檢查是否作者 isPostAuthor ?
const deletePost = (postId) =>
  posts.splice(posts.findIndex(post => post.id === postId), 1)[0];


module.exports = {
  getAllPosts,
  filterPostsByUserId,
  addPost,
  findPostByPostId,
  updatePost,
  deletePost,
}