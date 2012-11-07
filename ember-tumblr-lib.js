// http://stackoverflow.com/questions/1568210/integrating-tumblr-blog-with-website/3393151#3393151

Tumblr = Em.Object.create({
    api_key:'3Uj5hvL773MVNlhFJC5gyVftNh4Qxci3hqoPkU3nAzp9bFJ8UB',
    base_hostname:'w0w13z0w13.tumblr.com'
})

Tumblr.adapter = DS.Adapter.create({
    findQuery: function(store, type, query, modelArray) {
        var url = type.url,
            base_hostname = Tumblr.get('base_hostname'),
            api_key = Tumblr.get('api_key'),
            ajaxParams = {
                dataType: 'jsonp',
                url: url.fmt(base_hostname, api_key),
                data: query,
                success:function(data) {
                    if (Tumblr.Post == type) {
                        modelArray.load(data.response.posts);
                    } else if (Tumblr.Blog == type) {
                        data.response.blog.id = data.response.blog.name
                        modelArray.load([data.response.blog]);
                    }
                }
            }
        jQuery.ajax(ajaxParams)
    },
    find: function(store, type, id) {
        var url = type.url,
            base_hostname = Tumblr.get('base_hostname'),
            api_key = Tumblr.get('api_key'),
            ajaxParams = {
                dataType: 'jsonp',
                url: url.fmt(base_hostname, api_key),
                data: {id:id},
                success:function(data) {
                    if (Tumblr.Post == type) {
                        store.load(type, id, data.response.posts[0]);
                    } else if (Tumblr.Blog == type) {
                        data.response.blog.id = data.response.blog.name
                        modelArray.load(data.response.blog);
                    }
                }
            }
        jQuery.ajax(ajaxParams)
    }
})
Tumblr.adapter.registerTransform('jsonval', {
    fromJSON: function(value) {
        return value
    },
    toJSON: function(value) {
        return value
    }
});
Tumblr.store = DS.Store.create({
    revision: 7,
    adapter: Tumblr.adapter
});

Tumblr.Blog = DS.Model.extend({
    title: DS.attr('jsonval'),
    posts: DS.attr('jsonval'),
    name: DS.attr('jsonval'),
    updated: DS.attr('jsonval'),
    description: DS.attr('jsonval'),
    ask: DS.attr('jsonval'),
    ask_anon: DS.attr('jsonval'),
    likes: DS.attr('jsonval')
})
Tumblr.Blog.reopenClass({
    url: "http://api.tumblr.com/v2/blog/%@/info?api_key=%@"
})

Tumblr.Post = DS.Model.extend({
    /* General
     * http://www.tumblr.com/docs/en/api/v2#posts
     */
    blog_name: DS.attr('jsonval'),
    post_url: DS.attr('jsonval'),
    type: DS.attr('jsonval'),
    timestamp: DS.attr('jsonval'),
    date: DS.attr('jsonval'),
    format: DS.attr('jsonval'),
    reblog_key: DS.attr('jsonval'),
    bookmarklet: DS.attr('jsonval'),
    mobile: DS.attr('jsonval'),
    state: DS.attr('jsonval'),
    source_url: DS.attr('jsonval'),
    source_title: DS.attr('jsonval'),
    liked: DS.attr('jsonval'),
    total_posts: DS.attr('jsonval'),

    /* Text
     * http://www.tumblr.com/docs/en/api/v2#text-posts
     */
    title: DS.attr('jsonval'),
    body: DS.attr('jsonval'),

    /* Photo
     * http://www.tumblr.com/docs/en/api/v2#photo-posts
     */
     photos: DS.attr('jsonval'),
     caption: DS.attr('jsonval'),
     width: DS.attr('jsonval'),
     height: DS.attr('jsonval'),

    /* Quote
     * http://www.tumblr.com/docs/en/api/v2#quote-posts
     */
     text: DS.attr('jsonval'),
     source: DS.attr('jsonval'),

    /* Link
     * http://www.tumblr.com/docs/en/api/v2#link-posts
     */
     url: DS.attr('jsonval'),
     description: DS.attr('jsonval'),

    /* Chat
     * http://www.tumblr.com/docs/en/api/v2#chat-posts
     */
     dialogue: DS.attr('jsonval'),

    /* Audio
     * http://www.tumblr.com/docs/en/api/v2#audio-posts
     */
    player: DS.attr('jsonval'),
    plays: DS.attr('jsonval'),
    album_art: DS.attr('jsonval'),
    artist: DS.attr('jsonval'),
    album: DS.attr('jsonval'),
    track_name: DS.attr('jsonval'),
    track_jsonval: DS.attr('jsonval'),
    year: DS.attr('jsonval'),

    /* Video
     * http://www.tumblr.com/docs/en/api/v2#video-posts
     */

    reblogUrl:function() {
        var id = this.get('id'),
            reblog_key = this.get('reblog_key')
        return "http://www.tumblr.com/reblog/%@/%@".fmt(id, reblog_key)
    }.property()
})
Tumblr.Post.reopenClass({
    url: "http://api.tumblr.com/v2/blog/%@/posts?api_key=%@"
})

// https://github.com/emberjs/ember.js/issues/1378

Tumblr.Router = Ember.Router.extend({
    enableLogging:true,
    root: Ember.Route.extend({
        showHome:Ember.Route.transitionTo('index'),
        index: Em.Route.extend({
            route:'/',
            redirectsTo:'blog.index'
        }),
        blog: Em.Route.extend({
            route:'/blog',
            index: Em.Route.extend({
                route: '/',
                redirectsTo: 'blog.posts'
            }),
            posts: Em.Route.extend({
                route:'/page/:page',
                connectOutlets:function(router,params) {
                    var page = parseInt(params.page),
                        offset = (page-1)*20
                    router.api.GetPosts({offset:offset}, function(data){
                        router.get('tumblrPostsController').set('content', data.posts)
                        router.get('tumblrPostsController').set('is_loading', false)
                        router.set('onPage', page)
                    })
                    router.get('tumblrBlogController').connectOutlet('tumblrPosts')
                    router.get('tumblrPostsController').set('is_loading', true)
                }
            }),
            postDetail:Em.Route.extend({
                route:'/post/:id',
                connectOutlets:function(router,params) {
                    router.get('applicationController').connectOutlet('tumblrBlog')
                    return router.api.GetPosts({id:params.id},function(data){
                        router.get('tumblrBlogController').set('content', data.blog)
                        router.get('tumblrBlogController').connectOutlet('tumblrPostDetail', data.posts[0])
                    })
                }
            })
        })
    })
})

/* Outlet Views */
Tumblr.ApplicationView = Em.View.extend({
    template: Em.Handlebars.compile('<div class="row">{{outlet}}</div>')
})
Tumblr.ApplicationController = Em.Controller.extend()

Tumblr.TumblrBlogView = Em.View.extend({
    templateName:'tumblr-blog-tmpl'
})
Tumblr.TumblrBlogController = Em.Controller.extend({
    page:1
})
Tumblr.TumblrPostsView = Em.View.extend({
    templateName:'tumblr-posts-tmpl'
})
Tumblr.TumblrPostsController = Em.Controller.extend()
Tumblr.TumblrPostDetailView = Em.View.extend({
    templateName: 'tumblr-postdetail-tmpl'
})
Tumblr.TumblrPostDetailController = Em.Controller.extend()

Tumblr.NavigationView = Em.View.extend({
    template:Em.Handlebars.compile('<a {{action showPreviousPage}} href="#">Previous</a> | <a {{action showNextPage}} href="#">Next</a>')
})

/* Core Object Views */

Tumblr.PostView = Em.View.extend({
    classNames:['post'],
    templateName:'tumblr-post-tmpl',
    postBinding:'content'
})

Tumblr.PostDetailView = Tumblr.PostView.extend({
    classNames:['detail'],
    is_detail:true
})

Tumblr.PostsView = Em.CollectionView.extend({
    tagName:'div',
    classNames:['span7', 'offset5'],
    itemViewClass: Tumblr.PostView.extend({
        tagName:'div',
        classNames:[]
    })
})

/* Helper Views */
Tumblr.PhotoView = Em.View.extend({
    classNames:['photo'],
    init:function() {
        this._super()
        var sizes = Em.ArrayController.create({
            content:this.get('content.alt_sizes'),
            sortProperties: ['width']
        })
        this.set('sizes',sizes)
    },
    unknownProperty: function(keyName) {
        if (keyName.indexOf('photo-url-') != -1) {
            var sizes = this.get('sizes'),
                width = parseInt(keyName.replace('photo-url-','')),
                size = sizes.findProperty('width', width)
            if (!size) {
                size = sizes.get('lastObject')
            }
            return size
        }
    }
})

Tumblr.PhotoSetView = Em.CollectionView.extend({
    tagName:'div',
    classNames:['photoset'],
    itemViewClass:Tumblr.PhotoView
})

Tumblr.VideoView = Em.View.extend({
    classNames:['video'],
    init:function() {
        this._super()
        /* Convert our sizes into easily accessible properties */
        this.get('content').forEach(function(size) {
            this.set('video-embed-'+size.width, Em.Object.create(size))
        }, this)
    }
})

/* Application */
Tumblr.Application = Em.Application.extend({
    autoinit: false,
    init:function() {
        this._super()
        this.ApplicationView = Tumblr.ApplicationView
        this.ApplicationController = Tumblr.ApplicationController
        this.TumblrBlogView = Tumblr.TumblrBlogView
        this.TumblrBlogController = Tumblr.TumblrBlogController
        this.TumblrPostDetailView = Tumblr.TumblrPostDetailView
        this.TumblrPostDetailController = Tumblr.TumblrPostDetailController
        this.TumblrPostsView = Tumblr.TumblrPostsView
        this.TumblrPostsController = Tumblr.TumblrPostsController
    },
    initialize:function(router) {
        if (!router) {
            router = Tumblr.Router.create({
                api: Tumblr.Api.create(this.getWithDefault('apiParams',{}))
            })
        }
        this._super(router)
        this.registerHandlebarsHelpers()
    },
    post_types:['photo', 'video', 'text', 'quote', 'link', 'chat', 'audio', 'answer'],
    registerHandlebarsHelpers:function() {
        /* Render block if the view does not have is_detail set to 'true' */
        Em.Handlebars.registerHelper('preview', function(options) {
            var is_detail = !Ember.Handlebars.getPath(this, 'view.is_detail', options)
            return !is_detail ? options.inverse(this) : options.fn(this);
        });

        /* Render block if the view has is_detail set to 'true' */
        Em.Handlebars.registerHelper('detail', function(options) {
            var is_detail = Ember.Handlebars.getPath(this, 'view.is_detail', options)
            return !is_detail ? options.inverse(this) : options.fn(this);
        });

        /* Render each block if the type of the content matches the type of the tag */
        jQuery.each(this.post_types, function(i,type) {
            Em.Handlebars.registerHelper(type, function(options) {
                var is_type = Ember.Handlebars.getPath(this, 'view.content.type', options) == type
                return !is_type ? options.inverse(this) : options.fn(this);
            });
        });
    }
})

