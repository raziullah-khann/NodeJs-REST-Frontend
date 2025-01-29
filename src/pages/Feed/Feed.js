import React, { Component, Fragment } from "react";

import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import "./Feed.css";

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false,
  };

  componentDidMount() {
    fetch("http://localhost:8080/auth/status", {
      headers: {
        Authorization: "Bearer " + this.props.token,
      },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("Failed to fetch user status.");
        }
        return res.json();
      })
      .then((resData) => {
        this.setState({ status: resData.status });
      })
      .catch(this.catchError);

    this.loadPosts();
  }

  componentWillUnmount() {
    // Clean up the socket connection
    if (this.socket) {
      this.socket.off("posts"); // Remove specific listener
      this.socket.disconnect(); // Close the connection
    }
  }

  loadPosts = (direction) => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }
    const graphqlQuery = {
      query: `
        {
          getPost(page: ${page}) {
            posts {
              _id
              title
              content
              creator {
                name
              }
              createdAt
            }
            totalPost
          }
        }
      `,
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error("Fetching posts failed!");
        }
        this.setState({
          posts: resData.data.getPost.posts.map((post) => {
            return {
              ...post,
              imagePath: post.imageUrl,
            };
          }),
          totalPosts: resData.data.getPost.totalPost,
          postsLoading: false,
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = (event) => {
    event.preventDefault();
    fetch("http://localhost:8080/auth/status", {
      method: "PATCH",
      body: {
        status: this.state.status,
      },
      headers: {
        Authorization: "Bearer " + this.props.token,
      },
    })
      .then((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then((resData) => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = (postId) => {
    this.setState((prevState) => {
      const loadedPost = { ...prevState.posts.find((p) => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost,
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  //it is responsible for handling when we click accept button
  finishEditHandler = (postData) => {
    this.setState({
      editLoading: true,
    });
    const formData = new FormData();
    // Only append the new image if it exists
    if (postData.image) {
      formData.append("image", postData.image);
    } else {
      console.log("No new image provided, keeping the existing one");
    }

    if (this.state.editPost && this.state.editPost.imageUrl) {
      console.log("Appending oldPath:", this.state.editPost.imageUrl);
      formData.append("oldPath", this.state.editPost.imageUrl);
    }

    fetch("http://localhost:8080/post-image", {
      method: "PUT",
      body: formData,
      headers: {
        Authorization: "Bearer " + this.props.token,
      },
    })
      .then((res) => res.json())
      .then((fileResData) => {
        console.log("fileResData hai", fileResData);
        let imageUrl =
          fileResData.filePath || this.state.editPost?.imageUrl || "";
        console.log("Final imageUrl before sending mutation:", imageUrl);
        let graphqlQuery = {
          query: `
          mutation {
            createPost(postInput: {title: "${postData.title}", content: "${
            postData.content
          }", imageUrl: ${imageUrl ? JSON.stringify(imageUrl) : '""'}}) {
              _id
              title
              content
              imageUrl
              creator {
                name
              }
              createdAt
            }
          }
        `,
        };

        if (this.state.editPost) {
          graphqlQuery = {
            query: `
            mutation {
              updatePost(id: "${
                this.state.editPost._id
              }", postInput: {title: "${postData.title}", content: "${
              postData.content
            }", ${imageUrl ? `, imageUrl: ${JSON.stringify(imageUrl)}` : ""}}) {
                _id
                title
                content
                imageUrl
                creator {
                  name
                }
                createdAt
              }
            }
          `,
          };
        }

        return fetch("http://localhost:8080/graphql", {
          method: "POST",
          body: JSON.stringify(graphqlQuery),
          headers: {
            Authorization: "Bearer " + this.props.token,
            "Content-Type": "application/json",
          },
        });
      })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error(
            "Validation failed. make sure email address isn't used yet!"
          );
        }
        if (resData.errors) {
          throw new Error("Post creation failed!");
        }
        console.log(resData);

        let resDataField = "createPost";
        if (this.state.editPost) {
          resDataField = "updatePost";
        }

        const post = {
          _id: resData.data[resDataField]._id,
          title: resData.data[resDataField].title,
          content: resData.data[resDataField].content,
          creator: resData.data[resDataField].creator,
          createdAt: resData.data[resDataField].createdAt,
          imagePath: resData.data[resDataField].imageUrl,
        };
        console.log("POst hai jo setstate me jayega", post);

        this.setState((prevState) => {
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              (p) => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          } else {
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            // editPost: null,
            editPost: {
              ...post, // Ensure it includes `imageUrl`
              imageUrl: post.imageUrl || "", // Default to empty string if undefined
            },
            editLoading: false,
          };
        });
      })
      .catch((err) => {
        console.log("catch block", err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err,
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = (postId) => {
    this.setState({ postsLoading: true });
    fetch("http://localhost:8080/feed/post/" + postId, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + this.props.token,
      },
    })
      .then((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Deleting a post failed!");
        }
        return res.json();
      })
      .then((resData) => {
        console.log(resData);
        this.loadPosts();
        // this.setState(prevState => {
        //   const updatedPosts = prevState.posts.filter(p => p._id !== postId);
        //   return { posts: updatedPosts, postsLoading: false };
        // });
      })
      .catch((err) => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = (error) => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map((post) => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator?.name}
                  date={new Date(post.createdAt).toLocaleDateString("en-US")}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
