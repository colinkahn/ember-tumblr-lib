Tumblr = Em.Object.create({
    api_key:'3Uj5hvL773MVNlhFJC5gyVftNh4Qxci3hqoPkU3nAzp9bFJ8UB',
    base_hostname:'demo.tumblr.com',
    posts_per_page:6
})

Ember.ResourceAdapter.reopen({
    _prepareResourceRequest: function(params){
        params.dataType = 'JSONP'
    }
})

Tumblr.Blog = Ember.Resource.extend({
    resourceUrl: 'http://api.tumblr.com/v2/blog/%@/info?api_key=%@'.fmt(Tumblr.get('base_hostname'), Tumblr.get('api_key')),
    resourceName: 'blog',
    deserialize: function(json) {
        if (json.response) {
            return this._super(json.response.blog)
        } else {
            return this
        }
    },
    _resourceUrl: function() {
        return this.resourceUrl
    }
})

Tumblr.Post = Ember.Resource.extend({
    resourceUrl: 'http://api.tumblr.com/v2/blog/%@/posts?api_key=%@'.fmt(Tumblr.get('base_hostname'), Tumblr.get('api_key')),
    resourceName: 'post',
    deserialize: function(json) {
        if (json.response) {
            return this._super(json.response.posts[0])
        } else if (json.id) {
            return this._super(json)
        }
    },
    _resourceUrl: function() {
        return this.resourceUrl + '&id=' + this._resourceId()
    },
    deserializeProperty:function(prop, value) {
        switch(prop) {
            case 'photos':
                value.forEach(function(photo){
                    photo.alt_sizes.forEach(function(alt_size){
                        if (alt_size.width == 75) {
                            this.set('thumbnail', alt_size.url)
                        } else {
                            var key = 'photo_url_'+alt_size.width
                            photo[key] = alt_size.url
                        }
                    }, this)
                }, this)
                break;
            case 'player':
                if (typeof value != 'string') {
                    value.forEach(function(embed){
                        var key = 'video_embed_'+embed.width
                        this.set(key, embed.embed_code)
                    }, this)
                }
                break;
        }
        this.set(prop,value)
    },
    reblogUrl:function() {
        var id = this.get('id'),
            reblog_key = this.get('reblog_key')
        return "http://www.tumblr.com/reblog/%@/%@".fmt(id, reblog_key)
    }.property()
});

Tumblr.PostView = Em.View.extend({
    templateName:'tumblr-post-tmpl',
    classNames:["media"]
});

Tumblr.TagView = Bootstrap.Label.extend({
    classNames:['tag'],
    template:Em.Handlebars.compile('<a {{bindAttr href="view.href"}}>#{{view.content}}</a>'),
    href:Em.computed(function() {
        return "http://www.tumblr.com/tagged/%@".fmt(this.get('content'))
    }).property('content').cacheable()
})

/* Application */
Tumblr.app = Em.Application.create({
    autoinit: false,
    initialize:function(router) {
        this._super(router)
        this.registerHandlebarsHelpers()
    },
    Router: Ember.Router.extend({
        scrollToTop:function() {
            Em.run.next(function(){ // Hack to push us to the top of the page
                $('html, body').animate({ scrollTop: 0 }, 0);
            })
        },
        enableLogging:true,
        root: Ember.Route.extend({
            showHome:Ember.Route.transitionTo('index'),
            showPost:Ember.Route.transitionTo('postDetail'),
            index: Em.Route.extend({
                route:'/',
                enter:function(router) {
                    router.transitionTo('posts', {page:1});
                }
            }),
            posts: Em.Route.extend({
                route:'/page/:page',
                enter:function(router) {
                    router.scrollToTop()
                },
                connectOutlets:function(router,params) {
                    var page = parseInt(params.page),
                        per_page = Tumblr.get('posts_per_page'),
                        offset = (page-1)*per_page
                    router.get('pagerController').set('page',page)
                    router.get('applicationController').connectOutlet('posts')
                    router.get('postsController').clear() // Immediately clear existing posts
                    router.get('postsController').loadQuery({limit:per_page, offset:offset})
                }
            }),
            postDetail:Em.Route.extend({
                route:'/post/:id',
                connectOutlets:function(router,params) {
                    var post = Tumblr.Post.create(params)
                    post.findResource()
                    post.set('is_detail', true)
                    router.get('applicationController').connectOutlet('postDetail', post)
                }
            })
        })
    }),

    ApplicationView: Em.View.extend({
        templateName: 'tumblr-blog-tmpl'
    }),

    ApplicationController: Em.Controller.extend({
        init:function() {
            this._super()
            var blog = Tumblr.Blog.create()
            blog.findResource()
            this.set('content', blog)
        }
    }),

    PostDetailController: Em.View.extend(),

    PostDetailView: Em.View.extend({
        templateName:'tumblr-postdetail-tmpl'
    }),

    PostsView: Em.View.extend({
        templateName:'tumblr-posts-tmpl'
    }),

    PostsController: Ember.ResourceController.extend({
        resourceType: Tumblr.Post,
        loadAll: function(json) {
            this._super(json.response.posts)
        },
        loadQuery: function(data) {
            var self = this;

            params = {type:'GET'}
            params.data = data || {}

            return this._resourceRequest(params)
                .done(function(json) {
                    self.clearAll();
                    self.loadAll(json);
                });
        }
    }),

    PagerController: Em.ArrayController.extend({
        url:'#/page/%@',
        page:1,
        totalPostsBinding: 'Tumblr.app.router.applicationController.content.posts',
        init:function() {
            this._super()
            var previous = Ember.Object.create({
                    controller:this,
                    title:"&larr; Previous",
                    previous:true,
                    hrefBinding:"controller.previousHref",
                    disabledBinding:"controller.previousDisabled"
                }),
                next = Ember.Object.create({
                    controller:this,
                    title: "Next &rarr;",
                    next:true,
                    hrefBinding:"controller.nextHref",
                    disabledBinding:"controller.nextDisabled"
                })
            this.set('content', Ember.A([previous,next]))
        },
        previousHref: Ember.computed(function() {
            var url = this.get('url'),
                page = this.get('page')
            return url.fmt(page-1)
        }).property('page').cacheable(),
        nextHref: Ember.computed(function() {
            var url = this.get('url'),
                page = this.get('page')
            return url.fmt(page+1)
        }).property('page').cacheable(),
        previousDisabled: Ember.computed(function() {
            return this.get('page') <= 1
        }).property('page').cacheable(),
        nextDisabled: Ember.computed(function() {
            var totalPosts = this.get('totalPosts'),
                per_page = Tumblr.get('posts_per_page'),
                page = this.get('page')
            return ((page+1)*per_page) > totalPosts
        }).property('page', 'totalPosts').cacheable()
    }),

    post_types:['photo', 'video', 'text', 'quote', 'link', 'chat', 'audio', 'answer'],

    registerHandlebarsHelpers:function() {
        /* Render block if the view does not have is_detail set to 'true' */
        Em.Handlebars.registerHelper('preview', function(options) {
            var is_detail = !Ember.Handlebars.getPath(this, 'view.controller.is_detail', options)
            return !is_detail ? options.inverse(this) : options.fn(this);
        });

        /* Render block if the view has is_detail set to 'true' */
        Em.Handlebars.registerHelper('detail', function(options) {
            var is_detail = Ember.Handlebars.getPath(this, 'view.controller.is_detail', options)
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

Tumblr.app.initialize()
