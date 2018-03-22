﻿import { FileContract } from '../files/IFile';
import { BlogPostContract } from '../blogs/BlogPostContract';

export interface IBlogService {
    search(pattern: string): Promise<Array<BlogPostContract>>;

    getBlogPostByKey(key: string): Promise<BlogPostContract>;

    deleteBlogPost(blogPostRef: BlogPostContract): Promise<void>;

    createBlogPost(title: string, description: string, keywords): Promise<BlogPostContract>;

    updateBlogPost(blogPostRef: BlogPostContract): Promise<void>;
}
