import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    fetch('http://localhost:8080/feed/post/' + postId)
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch status');
        }
        return res.json();
      })
      .then(resData => {
        const post = Array.isArray(resData.post) ? resData.post[0] : resData.post; // Handle both array and object
        if (!post) {
          throw new Error('Post not found!');
        }
        console.log(resData);
        this.setState({
          title: post.title,
          author: post.creator?.name || 'Unknown Author',
          image: 'http://localhost:8080/' + resData.post.imageUrl,
          date: new Date(post.createdAt).toLocaleDateString('en-US'),
          content:post.content
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
