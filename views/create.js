<%- include('shared/top.ejs') %>
<class="card">
            <div class="card-body">
                <h2>Pterodactyl Details</h2>
                <p><strong>URL:</strong> <a href="https://game.meegie.net/" target="_blank">https://game.meegie.net/</a>
                </p>
                <p><strong>Username:</strong> u<%- req.session.user.id %></p>
                <p><strong>Password:</strong> <%- pass %></p>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <h2>Your Servers</h2>
                <ul class="list-group">
                    <% for(var i=0; i<servers.length; i++) { %>
                        <li class="list-group-item">
                            <a href="https://game.meegie.net/server/<%- servers[i].pteroUID %>">
                                <%= servers[i].name %> (<%= (servers[i].ram)/1024 %> GB RAM)
                            </a>
                        </li>
                        <% } %>
                </ul>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <h3>Create Server</h3>
                <form action="/dash/server/api/create">
                    <div class="mb-3">
                        <label for="name" class="form-label">Server Name:</label>
                        <input type="text" class="form-control" name="name" id="name" placeholder="My server!">
                    </div>
                    <div class="mb-3">
                        <span>Server software: PaperMC</span>
                    </div>
                    <button type="submit" class="btn btn-primary">Create server!</button>
                </form>
            </div>
        </div>

 <div id="frame" style="width: 100%;"><iframe data-aa='2312977' src='//acceptable.a-ads.com/2312977' style='border:0px; padding:0; width:100%; height:100%; overflow:hidden; background-color: transparent;'></iframe><a style="display: block; text-align: right; font-size: 12px" id="frame-link" href="https://a-ads.com/?partner=2312977">Advertise here</a></div>

<%- include('shared/bottom.ejs') %>
