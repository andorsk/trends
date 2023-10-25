document.addEventListener("DOMContentLoaded", async () => {
  console.log("Adding event listener");
  const dropdown = document.querySelector(".dropdown");
  const graphContent = document.querySelector(".graph-content");

  const updateData = async () => {
    console.log("updating data...");
    const keyword = dropdown.value;
    var data = [];
    const listItems = document.querySelectorAll("#buzzwords li");
    const keywords = Array.from(listItems).map((item) => item.textContent);
    const keywordData = [];

    const fetchData = async () => {
      const promises = keywords.map((keyword) =>
        fetch(`/trends?keyword=${keyword}`)
          .then((response) => response.json())
          .then((data) => {
            data.keyword = keyword; // Add the keyword property to the data object

            return { keyword: keyword, data: data };
          })
      );
      const data = await Promise.all(promises);
      data.forEach((d) => keywordData.push(d));
      plotData(keywordData); // Modify your plotData function to handle multiple datasets if needed
    };
    fetchData();
  };

  dropdown.addEventListener("change", async () => {
    updateData();
  });

  const plotData = (data) => {
    const datasets = data.map((d) => d.data);
    const keywords = data.map((d) => d.keyword);
    // Clear previous graph content
    graphContent.innerHTML = "";

    // Dimensions
    const width = graphContent.clientWidth;
    const height = graphContent.clientHeight;

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };

    const svg = d3
      .select(".graph-content")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "black");

    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "black")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border", "1px solid white")
      .style("z-index", "10")
      .style("pointer-events", "none")
      .style("transition", "opacity 0.3s ease")
      .style("border-radius", "5px");
    //      .style("opacity", 0);

    const transformedData = [];
    data.forEach((d) => {
      const flattened = d.data.default.timelineData.flat();
      flattened.forEach((point, index) => {
        const obj = { date: point.time * 1000 };
        obj[d.keyword] = flattened[index].value[0];
        transformedData.push(obj);
      });
    });

    const keys = data.map((d) => d.keyword);
    const mergedData = {};
    transformedData.forEach((arr) => {
      const entry = arr;
      const date = entry.date;
      if (!mergedData[date]) {
        mergedData[date] = { date: date };
      }
      Object.assign(mergedData[date], entry);
    });

    const result = Object.values(mergedData);

    const xScale = d3.scaleTime().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const stack = d3.stack().keys(keywords); // Add other keys as needed
    const stackedData = stack(result);

    yScale.domain([0, d3.max(stackedData, (d) => d3.max(d, (d) => d[1]))]);
    yScale.domain([
      d3.min(stackedData, (d) => d3.min(d, (d) => d[0])),
      d3.max(stackedData, (d) => d3.max(d, (d) => d[1])),
    ]);

    xScale.domain(d3.extent(result, (d) => d.date));

    const area = d3
      .area()
      .x((d) => {
        console.log(yScale(d[0]), yScale(d[1]));
        return xScale(d.data.date);
      })
      .y0((d) => yScale(d[0]))
      .y1((d) => yScale(d[1]));

    const areaChart = svg
      .selectAll("path")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", function (d) {
        return "myArea " + d.key;
      })
      .attr("d", area)
      .attr("fill", (d) => color(d.key));

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    svg.append("g").call(d3.axisLeft(yScale));

    // Draw lines
    datasets.forEach((data, index) => {
      // Line generator
      const line = d3
        .line()
        .x((d) => xScale(new Date(d.time * 1000)))
        .y((d) => yScale(d.value[0]));

      // Draw line
      svg
        .append("path")
        .datum(data.default.timelineData)
        .attr("fill", "none")
        .attr("stroke", color(index))
        .attr("stroke-width", 1)
        .attr("d", line);

      const hoverPath = svg
        .append("path")
        .datum(data.default.timelineData)
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 1) //This width determines the "padding" for hover
        .attr("d", line);

      const svgBounds = svg.node().getBoundingClientRect();

      areaChart
        .on("mouseover", (event, d) => {
          const mouseX = event.clientX - svgBounds.left;
          const date = xScale.invert(mouseX); //Convert mouse x-coordinate to date
          console.log("OVER DATE", date);
          let closestDataPoint;
          let minDifference = Infinity;
          console.log(data);
          data.default.timelineData.forEach((point) => {
            const difference = Math.abs(date - new Date(point.time * 1000));
            if (difference < minDifference) {
              minDifference = difference;
              closestDataPoint = point;
            }
          });

          //    Update tooltip content
          tooltip
            .html(
              `Keyword: ${data.keyword}<br>Value: ${closestDataPoint.value[0]}`
            )
            .style("left", mouseX + 10 + "px")
            .style("top", yScale(closestDataPoint.value[0]) + "px")
            .transition()
            .duration(200)
            .style("opacity", 0.9);
        })
        .on("mouseout", () => {
          tooltip.transition().duration(500).style("opacity", 0);
        });

      const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 150}, ${index * 20})`);

      legend
        .append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", color(index));

      legend
        .append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text(keywords[index])
        .attr("fill", "white");
    });

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickSize(-height + margin.top + margin.bottom)
      .tickFormat(d3.timeFormat("%Y-%m"));
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-width + margin.left + margin.right);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .attr("color", "white");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .attr("color", "white");
  };

  updateData();
});
